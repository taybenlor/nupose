class WidgetsController < ApplicationController
  before_filter :verify, only: [:show, :update, :destroy]
  def show
    render json: @widget
  end
  
  def create
    @widget = Widget.new(params[:widget])
    if @widget.verify(params[:secret])
      @widget.save
    else
      render nothing: true
    end
  end

  def update
    @widget.update(params[:widget])
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
