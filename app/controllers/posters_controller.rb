class PostersController < ApplicationController
  before_filter :verify, only: [:edit, :update, :destroy]
  def show
    @poster = Poster.find(params[:id]) if params[:id]
    @poster = Poster.find(params[:url]) if params[:url]
    redirect_to :root unless @poster
  end
  
  def new
    @poster = Poster.new(secret: SecureRandom.hex(10), url: SecureRandom.hex(5))
    until @poster.save
      @poster.url = SecureRandom.hex(5)
    end
    #theres obviously much better ways to do this
    #for example, represent the id in base64... with padding
    redirect_to edit_poster_url(@poster, secret: @poster.secret)
  end

  def edit
    @poster = Poster.find(params[:id])
  end

  def update
    @poster.update(params[:poster])
    render json: @poster.errors
  end

  def destroy
    render json: @poster.destroy
  end
  
  private
  def verify
    @poster = Poster.find(params[:id])
    redirect_to :root unless @poster.secret == params[:secret]
  end
end
