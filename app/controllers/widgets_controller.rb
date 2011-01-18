class WidgetsController < ApplicationController
  before_filter :verify, only: [:show, :update, :destroy]
  def index
    @poster = Poster.find(params[:poster_id])
    if @poster.verify(params[:secret])
      render json: @poster.widgets
    else
      render json: [], status: 500
    end
  end
  
  def show
    render json: @widget
  end
  
  def create
    @widget = Widget.new(params[:widget])
    @widget.poster = Poster.find(@widget.poster_id)
    
    if @widget.verify(params[:secret])
      @widget.type = params[:widget][:type]
      @widget.save
      @widget = Widget.find(@widget.id)
      render json: @widget
    else
      render nothing: true, status: 500
    end
  end

  def update
    @widget.update_attributes(params[:widget])
    render json: @widget
  end
  
  def destroy
    render json: @widget.destroy
  end
  
  private
  def verify
    secret = params[:secret]
    @widget = Widget.find(params[:id])
    render nothing: true unless @widget.verify(secret)
  end
end
